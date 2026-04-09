// Re-export from shared module and auto-initialize with localStorage.
// The shared version requires explicit storage initialization; this wrapper
// provides backward compatibility by auto-hydrating from localStorage.
import { webStorage } from '../storage/webStorage.js';

export { getPRDetails } from '../../shared/github/details.js';
import { initDetailCache } from '../../shared/github/details.js';

// Auto-hydrate cache from localStorage on module load
initDetailCache(webStorage);
