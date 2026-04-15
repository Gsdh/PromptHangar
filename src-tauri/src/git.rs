//! Epic 2 — Git sync.
//!
//! A *Git workspace* is a local directory the user has chosen to mirror a
//! subset of their prompts into. We never auto-push; the user is responsible
//! for remotes in v0.2 so we don't need credential handling on first cut.
//!
//! Each linked prompt gets a file at `prompts/<slug>-<short-id>.md` so two
//! prompts with the same title never collide. The file has YAML frontmatter
//! with stable metadata followed by a readable markdown body.

use crate::error::{AppError, AppResult};
use git2::{Repository, Signature};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

/// Validate that `path` is a directory that either already contains a Git
/// repository or is empty enough that we can `git init` it on the user's
/// behalf. Returns the normalized absolute path as a string.
pub fn validate_workspace_path(path: &str) -> AppResult<String> {
    let p = PathBuf::from(path);
    if !p.exists() {
        return Err(AppError::Invalid(format!("path does not exist: {path}")));
    }
    if !p.is_dir() {
        return Err(AppError::Invalid(format!("path is not a directory: {path}")));
    }

    // Existing repo? Good.
    if Repository::discover(&p).is_ok() {
        let canonical = fs::canonicalize(&p)?;
        return Ok(canonical.to_string_lossy().into_owned());
    }

    // Not a repo — init one. This is friendlier than forcing the user to run
    // `git init` themselves, and still safe because the directory exists.
    Repository::init(&p).map_err(git_err)?;
    let canonical = fs::canonicalize(&p)?;
    Ok(canonical.to_string_lossy().into_owned())
}

/// Render a prompt revision into a markdown file and commit it.
///
/// Idempotency: if the file hasn't changed since the last commit we skip
/// the commit entirely so saving a revision that didn't change the rendered
/// output (e.g. whitespace-only diff) doesn't spam history.
#[allow(clippy::too_many_arguments)]
pub fn commit_revision(
    workspace_path: &str,
    prompt_id: &str,
    title: &str,
    description: Option<&str>,
    revision_number: i64,
    content: &str,
    system_prompt: Option<&str>,
    note: Option<&str>,
) -> AppResult<Option<String>> {
    let repo = Repository::open(workspace_path).map_err(git_err)?;
    let workdir = repo
        .workdir()
        .ok_or_else(|| AppError::Invalid("bare repositories are not supported".into()))?
        .to_path_buf();

    let relative_path = relative_prompt_path(prompt_id, title);
    let abs_path = workdir.join(&relative_path);
    if let Some(parent) = abs_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let rendered = render_markdown(
        title,
        description,
        revision_number,
        content,
        system_prompt,
        note,
    );
    // Skip no-op writes so the commit log isn't polluted with identical revisions.
    if let Ok(existing) = fs::read_to_string(&abs_path) {
        if existing == rendered {
            return Ok(None);
        }
    }
    fs::write(&abs_path, &rendered)?;

    // Stage the file.
    let mut index = repo.index().map_err(git_err)?;
    index.add_path(&relative_path).map_err(git_err)?;
    index.write().map_err(git_err)?;
    let tree_oid = index.write_tree().map_err(git_err)?;
    let tree = repo.find_tree(tree_oid).map_err(git_err)?;

    // Use whatever identity the user has configured globally; fall back to a
    // static marker so first-time users still get a working commit.
    let sig = signature(&repo)?;

    let message = match note {
        Some(n) if !n.trim().is_empty() => {
            format!("{title}: rev {revision_number} — {n}")
        }
        _ => format!("{title}: rev {revision_number}"),
    };

    // Parent = HEAD if one exists. Otherwise this is the very first commit.
    let parents: Vec<git2::Commit> = match repo.head() {
        Ok(head) => vec![head.peel_to_commit().map_err(git_err)?],
        Err(_) => Vec::new(),
    };
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parent_refs)
        .map_err(git_err)?;
    Ok(Some(oid.to_string()))
}

/// Minimal working-tree status — enough for the UI to say "3 modified, 1
/// untracked" without dragging in `git2::StatusOptions` complexity.
pub fn workspace_status(workspace_path: &str) -> AppResult<WorkspaceStatus> {
    let repo = Repository::open(workspace_path).map_err(git_err)?;
    let statuses = repo
        .statuses(Some(
            git2::StatusOptions::new()
                .include_untracked(true)
                .include_ignored(false),
        ))
        .map_err(git_err)?;
    let mut modified = 0;
    let mut untracked = 0;
    for entry in statuses.iter() {
        let status = entry.status();
        if status.is_wt_new() || status.is_index_new() {
            untracked += 1;
        }
        if status.is_wt_modified()
            || status.is_index_modified()
            || status.is_index_renamed()
            || status.is_index_typechange()
        {
            modified += 1;
        }
    }
    let head_summary = repo
        .head()
        .ok()
        .and_then(|h| h.peel_to_commit().ok())
        .map(|c| c.id().to_string());
    Ok(WorkspaceStatus {
        modified,
        untracked,
        head: head_summary,
    })
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkspaceStatus {
    pub modified: i64,
    pub untracked: i64,
    pub head: Option<String>,
}

fn relative_prompt_path(prompt_id: &str, title: &str) -> PathBuf {
    let slug = slugify(title);
    // Short id guards against slug collisions (two prompts titled "Welcome").
    let short = prompt_id.chars().take(8).collect::<String>();
    let filename = format!("{slug}-{short}.md");
    Path::new("prompts").join(filename)
}

fn slugify(s: &str) -> String {
    let lower = s.to_lowercase();
    let mut out = String::with_capacity(lower.len());
    let mut prev_dash = true;
    for ch in lower.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
            prev_dash = false;
        } else if !prev_dash {
            out.push('-');
            prev_dash = true;
        }
    }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() { "prompt".to_string() } else { trimmed }
}

fn render_markdown(
    title: &str,
    description: Option<&str>,
    revision_number: i64,
    content: &str,
    system_prompt: Option<&str>,
    note: Option<&str>,
) -> String {
    let mut out = String::new();
    out.push_str("---\n");
    out.push_str(&format!("title: {}\n", yaml_escape(title)));
    if let Some(d) = description {
        out.push_str(&format!("description: {}\n", yaml_escape(d)));
    }
    out.push_str(&format!("revision: {revision_number}\n"));
    out.push_str(&format!(
        "updated: {}\n",
        chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ")
    ));
    if let Some(n) = note {
        if !n.trim().is_empty() {
            out.push_str(&format!("note: {}\n", yaml_escape(n)));
        }
    }
    out.push_str("---\n\n");

    out.push_str(&format!("# {title}\n\n"));
    if let Some(sp) = system_prompt {
        if !sp.trim().is_empty() {
            out.push_str("## System prompt\n\n");
            out.push_str(sp);
            out.push_str("\n\n");
        }
    }
    out.push_str("## Prompt\n\n");
    out.push_str(content);
    if !content.ends_with('\n') {
        out.push('\n');
    }
    out
}

fn yaml_escape(s: &str) -> String {
    // If it contains characters that would break YAML we wrap it in double
    // quotes and escape internal quotes. For the common case (plain ASCII
    // title) this is a no-op.
    if s.contains(['\n', ':', '#', '&', '*', '!', '|', '>', '\'', '"']) {
        format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\""))
    } else {
        s.to_string()
    }
}

fn signature(repo: &Repository) -> AppResult<Signature<'static>> {
    if let Ok(sig) = repo.signature() {
        // Clone-out of the borrowed sig so we can return 'static.
        let name = sig.name().unwrap_or("PromptHangar").to_string();
        let email = sig.email().unwrap_or("prompthangar@localhost").to_string();
        return Signature::now(&name, &email).map_err(git_err);
    }
    Signature::now("PromptHangar", "prompthangar@localhost").map_err(git_err)
}

fn git_err(e: git2::Error) -> AppError {
    AppError::Internal(format!("git: {e}"))
}
