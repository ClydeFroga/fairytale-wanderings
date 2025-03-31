import fs from "fs";
import path from "path";

export class DeleteFile {
  private static uploadDir = path.resolve(process.env.UPLOAD_PATH || "");

  static async deleteFile(filePath: string) {
    const fullPath = path.join(this.uploadDir, filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
