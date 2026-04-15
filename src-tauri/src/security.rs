// Epic 10 — master password + idle lock.
//
// Argon2id is the currently-recommended memory-hard password hash.  We store
// the full PHC string (`$argon2id$v=19$m=..$t=..$p=..$salt$hash`) in
// `app_security.password_phc`, which means the hash, salt, and parameters
// all travel together — no need to track which iteration count or salt we
// used on a particular machine, and no chance of a parameter drift breaking
// verification after a future upgrade.
//
// The lock state (`AppLocked`) lives in process memory, not the DB, for two
// reasons:
//   1. Restarting the app should always re-prompt when a password is set —
//      otherwise "lock on quit" would be a lie.
//   2. A boolean in the DB could silently be flipped by a background Git
//      sync, which would quietly hand the lock away.
//
// Initial value is seeded at startup (`init_from_db`): locked if a password
// exists, unlocked if none is set.

use crate::db::DbPool;
use crate::error::{AppError, AppResult};
use argon2::{Algorithm, Argon2, Params, Version};
use password_hash::{
    rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
};
use std::sync::atomic::{AtomicBool, Ordering};

/// Process-wide lock flag. `true` = UI must show the LockScreen overlay.
/// Falls to `false` only after a successful `verify_master_password`.
pub struct AppLocked(AtomicBool);

impl AppLocked {
    pub fn new(locked: bool) -> Self {
        Self(AtomicBool::new(locked))
    }

    pub fn is_locked(&self) -> bool {
        self.0.load(Ordering::Relaxed)
    }

    pub fn set_locked(&self, v: bool) {
        self.0.store(v, Ordering::Relaxed);
    }
}

/// Read the stored PHC (if any) from the single `app_security` row.
pub fn get_phc(pool: &DbPool) -> AppResult<Option<String>> {
    let conn = pool.lock();
    let phc: Option<String> = conn.query_row(
        "SELECT password_phc FROM app_security WHERE id = 1",
        [],
        |r| r.get(0),
    )?;
    Ok(phc)
}

/// True if a master password has been configured on this install.
pub fn has_password(pool: &DbPool) -> AppResult<bool> {
    Ok(get_phc(pool)?.is_some())
}

/// Hash `password` with Argon2id using OWASP-2023 minimums (m=19 MiB, t=2,
/// p=1). Returns a self-describing PHC string.
pub fn hash_password(password: &str) -> AppResult<String> {
    let params = Params::new(19_456, 2, 1, None)
        .map_err(|e| AppError::Internal(format!("argon2 params: {e}")))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let salt = SaltString::generate(&mut OsRng);
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("argon2 hash: {e}")))?;
    Ok(hash.to_string())
}

/// Verify `password` against a stored PHC string. `Ok(false)` means the
/// password was wrong; an `Err` means the PHC was malformed or the
/// underlying crypto errored (shouldn't happen for well-formed stored
/// hashes).
pub fn verify_password(password: &str, phc: &str) -> AppResult<bool> {
    let parsed = PasswordHash::new(phc)
        .map_err(|e| AppError::Internal(format!("argon2 parse: {e}")))?;
    let argon2 = Argon2::default();
    match argon2.verify_password(password.as_bytes(), &parsed) {
        Ok(()) => Ok(true),
        Err(password_hash::Error::Password) => Ok(false),
        Err(e) => Err(AppError::Internal(format!("argon2 verify: {e}"))),
    }
}

/// On startup, lock the app iff a password is configured.
pub fn init_from_db(pool: &DbPool) -> AppResult<AppLocked> {
    Ok(AppLocked::new(has_password(pool)?))
}
