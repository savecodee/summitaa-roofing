/**
 * Loads TanStack Start's ambient type augmentation for file-based server
 * routes. Without this import TypeScript does not know about the `server`
 * option on `createFileRoute`, even though the runtime supports it.
 *
 * This is a declaration-only file: it emits no JavaScript and adds nothing to
 * the client bundle.
 */
import '@tanstack/react-start'
