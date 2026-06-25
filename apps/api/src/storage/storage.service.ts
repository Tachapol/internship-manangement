import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient | null = null;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || this.configService.get<string>('SUPABASE_ANON_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'devplus-bucket';

    if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      this.logger.warn('Supabase URL or Key is not configured. Storage will run in mock mode.');
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'documents'): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (error) {
          this.logger.error(`Supabase upload error: ${error.message}`);
          throw new BadRequestException(`Failed to upload file to storage: ${error.message}`);
        }

        const { data: publicUrlData } = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
      } catch (err) {
        this.logger.error(`Exception during storage upload`, err);
        throw new BadRequestException('Failed to upload file to storage client');
      }
    } else {
      const mockUrl = `https://mock.supabase.storage/${this.bucketName}/${fileName}`;
      this.logger.log(`[MOCK STORAGE UPLOAD] File name: ${file.originalname}. Mock URL generated: ${mockUrl}`);
      return mockUrl;
    }
  }
}
