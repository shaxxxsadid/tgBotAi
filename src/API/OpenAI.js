import { Configuration, OpenAIApi } from "openai";
import configure from 'config';
import { createReadStream } from 'fs'

class OpenAI {
    roles = {
        ASSISTANT: 'assistant',
        USER: 'user',
        SYSTEM: 'system'
    }

    constructor(apiKey) {
        const configuration = new Configuration({
            apiKey,
        });
        this.openai = new OpenAIApi(configuration);
    }

    async chat(messages) {
        try {
            const response = await this.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: messages,
                
            })
            console.log(response.status)
            
            return response.data.choices[0].message.content;
        } catch (e) {
            console.log('Error while working with chatGPT', e.message)
            return "Упс что-то пошло не так."
        }
    }

    async createImage(message, size) {
        try {
            const response = await this.openai.createImage({
                prompt: message,
                n: 1,
                size: size,
            });
            const image_url = response.data.data[0].url;
            return image_url
        } catch (e) {
            console.log('Error while working with generate image with GPT', e.message)
            return "Упс что-то пошло не так."
        }
    }

    async voiceToText(filepath) {
        try {
            const response = await this.openai.createTranscription(
                createReadStream(filepath),
                'whisper-1'
            )
            return response.data.text
        } catch (e) {
            console.log('Error while prase voice to text')
        }
    }
}

export const openAi = new OpenAI(configure.get('OPENAI_KEY'))