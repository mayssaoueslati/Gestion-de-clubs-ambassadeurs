export class ChatMessage {
  sender: string;
  content: string;
  type: string;
  chatId: string;
  timestamp: Date;  

  constructor(sender: string, content: string, type: string, chatId: string, timestamp?: Date) {
    this.sender = sender;
    this.content = content;
    this.type = type;
    this.chatId = chatId;
    this.timestamp = timestamp || new Date(); // Default to current time if not provided
  }
}