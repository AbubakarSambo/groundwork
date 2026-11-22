/**
 * THE MOST ONE FILE MAY WEIGH, EVERYWHERE A FILE IS ADDED (Hafsah, 22 November 2026). Every upload route had its own 10 MB, and a file over
 * it was refused by the upload library with "File too large", which the check-in showed as "That did not upload". One number, the same at
 * the door (each route's upload limit) and in the code that reads the file, and one sentence that says the number.
 */
export const MOST_A_FILE_MAY_WEIGH_IN_MB = 25;
export const MOST_A_FILE_MAY_WEIGH = MOST_A_FILE_MAY_WEIGH_IN_MB * 1024 * 1024;
export const A_FILE_TOO_LARGE = `That file is larger than ${MOST_A_FILE_MAY_WEIGH_IN_MB} MB, which is the most one file can be, so nothing was added. Choose a smaller file, or split it into parts and add each one.`;
/** The limit every upload route hands the upload library. */
export const ONE_FILE = { limits: { fileSize: MOST_A_FILE_MAY_WEIGH } };
