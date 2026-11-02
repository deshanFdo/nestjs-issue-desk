import 'reflect-metadata';
import 'dotenv/config';
import { Controller, Get, Module, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiOperation, ApiTags, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Database } from './database';
import { IssuesController, IssuesService } from './issues';

@ApiTags('health') @Controller('health')
class HealthController {
  constructor(private readonly db: Database) {}
  @Get() @ApiOperation({summary:'Check API and database readiness'})
  async health() {
    try { await this.db.query('SELECT 1'); return {status:'ok',database:process.env.DATABASE_URL?'postgresql':'pglite'}; }
    catch { throw new ServiceUnavailableException('Database unavailable'); }
  }
}
@Module({controllers:[IssuesController,HealthController],providers:[Database,IssuesService]})
class AppModule {}

export async function createApp(logging = true) {
  const app = await NestFactory.create(AppModule,{logger:logging?undefined:false});
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true}));
  const config = new DocumentBuilder().setTitle('Issue Desk API').setDescription('A focused NestJS learning project for tracking software issues.').setVersion('1.0.0').build();
  const document = SwaggerModule.createDocument(app,config);
  SwaggerModule.setup('docs',app,document);
  app.enableShutdownHooks();
  return app;
}
