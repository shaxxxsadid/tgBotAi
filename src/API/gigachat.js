import axios from "axios";
import configure from 'config';
import { GigaChat } from 'gigachat-node';

class GIGAChatChat {

  constructor() {
  }

  async chat(messages) {
    const client = new GigaChat(configure.get('GIGACHAT_KEY'), true, true, true);
    await client.createToken();
    try {
      const responce = await client.completion({
        "model":"GigaChat:latest",
        "messages": messages
    });
    return responce.choices[0].message.content;
    } catch (e) {
      console.log('Error while working with GIGAChat', e.message);
      return null;
    }
  }
}

export const gigaChat = new GIGAChatChat();