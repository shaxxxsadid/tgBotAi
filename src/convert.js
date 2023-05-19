import axios from "axios";
import { createWriteStream } from "fs";
import { dirname, resolve } from 'path';
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import installer from "@ffmpeg-installer/ffmpeg";
import { removeFiles } from "./utilities.js";

const __dirname = dirname(fileURLToPath(import.meta.url))

class OggToMp {
    constructor() {
        ffmpeg.setFfmpegPath(installer.path)
    }

    toMp3(inputFile, outputFile) {
        try {
            const outputPath = resolve(dirname(inputFile), `${outputFile}.mp3`)
            return new Promise((resolve, reject) => {
                ffmpeg(inputFile)
                    .inputOption('-t 30')
                    .output(outputPath)
                    .on('end', () => {
                        removeFiles(inputFile)
                        resolve(outputPath)
                    })
                    .on('error', (err) => reject(err.message))
                    .run()
            })
        } catch (e) {
            console.error(); ('Error while converting ogg file to mp3 file', e.message)
        }
    }

    async create(url, filename, filetype) {
        try {
            const fileOggPath = resolve(__dirname, '../src/container', `${filename}.${filetype}`)
            const response = await axios({
                method: 'get',
                url,
                responseType: 'stream',
            })
            return new Promise((resolve) => {
                const stream = createWriteStream(fileOggPath)
                response.data.pipe(stream)
                stream.on('finish', () => resolve(fileOggPath))
            })

        } catch (e) {
            console.log('Error while creating ogg file ', e.message)
        }

    }
}

export const ogg = new OggToMp();