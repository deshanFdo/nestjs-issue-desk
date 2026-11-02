import { Body, Controller, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { randomUUID } from 'node:crypto';
import { Database } from './database';

export enum Status { Open = 'open', InProgress = 'in_progress', Resolved = 'resolved' }
export class CreateIssue {
  @ApiProperty({ example: 'Dashboard fails when weather provider times out', minLength: 3, maxLength: 120 })
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(3,120) title!: string;
  @ApiProperty({ example: 'Show fallback data instead of leaving the page blank.', minLength: 10, maxLength: 3000 })
  @Transform(({value}) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(10,3000) description!: string;
}
export class UpdateStatus {
  @ApiProperty({ enum: Status, example: Status.InProgress }) @IsEnum(Status) status!: Status;
}
export class ListIssues {
  @ApiPropertyOptional({ enum: Status }) @IsOptional() @IsEnum(Status) status?: Status;
  @ApiPropertyOptional({ default: 1, minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 }) @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 10;
}
export class Issue {
  @ApiProperty({format:'uuid'}) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({enum:Status}) status!: Status;
  @ApiProperty({type:String,format:'date-time'}) created_at!: string;
  @ApiProperty({type:String,format:'date-time'}) updated_at!: string;
}
export class IssueList {
  @ApiProperty({type:[Issue]}) items!: Issue[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}

@Injectable()
export class IssuesService {
  constructor(private readonly db: Database) {}
  async create(body: CreateIssue) {
    const {rows} = await this.db.query('INSERT INTO issues(id,title,description) VALUES($1,$2,$3) RETURNING *',[randomUUID(),body.title,body.description]);
    return rows[0];
  }
  async list(q: ListIssues) {
    // Both subqueries share one PostgreSQL statement snapshot, so total and items agree.
    const {rows} = await this.db.query(`SELECT
      (SELECT COUNT(*)::int FROM issues WHERE ($1::text IS NULL OR status=$1)) AS total,
      COALESCE((SELECT json_agg(selected) FROM (
        SELECT * FROM issues WHERE ($1::text IS NULL OR status=$1)
        ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3
      ) AS selected), '[]'::json) AS items`, [q.status || null,q.limit,(q.page-1)*q.limit]);
    return {...rows[0],page:q.page,limit:q.limit};
  }
  async find(id: string) {
    const {rows} = await this.db.query('SELECT * FROM issues WHERE id=$1',[id]);
    if (!rows[0]) throw new NotFoundException('Issue not found');
    return rows[0];
  }
  async update(id: string, body: UpdateStatus) {
    const {rows} = await this.db.query('UPDATE issues SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',[body.status,id]);
    if (!rows[0]) throw new NotFoundException('Issue not found');
    return rows[0];
  }
}

@ApiTags('issues') @Controller('issues')
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}
  @Post() @ApiOperation({summary:'Create an issue'}) @ApiResponse({status:201,type:Issue}) @ApiResponse({status:400,description:'Invalid request'})
  create(@Body() body: CreateIssue) { return this.issues.create(body); }
  @Get() @ApiOperation({summary:'List issues with status filtering and pagination'}) @ApiResponse({status:200,type:IssueList})
  list(@Query() query: ListIssues) { return this.issues.list(query); }
  @Get(':id') @ApiResponse({status:200,type:Issue}) @ApiResponse({status:404,description:'Issue not found'})
  find(@Param('id',new ParseUUIDPipe({version:'4'})) id: string) { return this.issues.find(id); }
  @Patch(':id/status') @ApiOperation({summary:'Change issue status'}) @ApiResponse({status:200,type:Issue}) @ApiResponse({status:404,description:'Issue not found'})
  update(@Param('id',new ParseUUIDPipe({version:'4'})) id: string,@Body() body: UpdateStatus) { return this.issues.update(id,body); }
}
