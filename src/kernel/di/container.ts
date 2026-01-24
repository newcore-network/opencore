import { container } from 'tsyringe'

/**
 * This is the global container for tsyringe, it contains all the dependencies to resolve, etc. Please use with caution.
 *  When you use in Server is the server-side container ONLY, if you use in Client is ONLY the container of client-side
 */
export const GLOBAL_CONTAINER = container
