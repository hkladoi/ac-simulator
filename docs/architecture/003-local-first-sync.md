# ADR 003: Local-first revision sync

Every edit updates the Zustand draft and debounced local storage before any request. Authenticated projects also persist in IndexedDB. Offline mutations queue with retry metadata. Server projects own a monotonically increasing revision; every draft update creates a version inside the same transaction that advances currentVersion.

A 409 is not retried as a blind overwrite. The UI fetches the server copy and requires one of three explicit outcomes: overwrite using the now-current server revision, take server, or create a separate project from local. Authentication secrets never enter local storage.
