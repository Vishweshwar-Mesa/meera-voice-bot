// One retry for transient failures (flaky JSON parsing, brief API hiccups)
// on calls where failing outright would otherwise surface as a dead end to
// the user with no automatic recovery.
export async function withRetry(fn, retries = 1) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    console.warn("Retrying after transient failure:", err.message);
    return withRetry(fn, retries - 1);
  }
}
