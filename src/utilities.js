import {unlink} from 'fs/promises';

export async function removeFiles(path) {
    try {
       await unlink(path)
    } catch (e) {
        console.log('Error while removing file', e.message)
    }
}