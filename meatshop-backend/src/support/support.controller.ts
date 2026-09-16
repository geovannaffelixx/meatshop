import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { User } from '../users/entities/user.entity';
import { AnswerSupportTicketDto } from './dtos/answer-support-ticket.dto';
import { CreateSupportTicketDto } from './dtos/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dtos/update-support-ticket.dto';
import { ListSupportTicketsQueryDto } from './dtos/list-support-tickets-query.dto';
import { AnswerSupportTicketUseCase } from './use-cases/answer-support-ticket.use-case';
import { CloseSupportTicketUseCase } from './use-cases/close-support-ticket.use-case';
import { CreateSupportTicketUseCase } from './use-cases/create-support-ticket.use-case';
import { GetSupportTicketUseCase } from './use-cases/get-support-ticket.use-case';
import { ListSupportTicketsUseCase } from './use-cases/list-support-tickets.use-case';
import { UpdateSupportTicketUseCase } from './use-cases/update-support-ticket.use-case';
import { SearchSupportTicketsUseCase } from './use-cases/search-support-tickets.use-case';
import { ReopenSupportTicketUseCase } from './use-cases/reopen-support-ticket.use-case';

@ApiTags('Support')
@ApiBearerAuth('access-token')
@Controller('support-tickets')
export class SupportController {
  constructor(
    private readonly createSupportTicketUseCase: CreateSupportTicketUseCase,
    private readonly updateSupportTicketUseCase: UpdateSupportTicketUseCase,
    private readonly answerSupportTicketUseCase: AnswerSupportTicketUseCase,
    private readonly closeSupportTicketUseCase: CloseSupportTicketUseCase,
    private readonly listSupportTicketsUseCase: ListSupportTicketsUseCase,
    private readonly getSupportTicketUseCase: GetSupportTicketUseCase,
    private readonly searchSupportTicketsUseCase: SearchSupportTicketsUseCase,
    private readonly reopenSupportTicketUseCase: ReopenSupportTicketUseCase,
  ) {}

  @ApiOperation({ summary: 'Opens a new support ticket' })
  @ApiResponse({
    status: 201,
    description: 'Support ticket created successfully',
  })
  @Post()
  create(@Body() dto: CreateSupportTicketDto, @CurrentUser() currentUser: User) {
    return this.createSupportTicketUseCase.execute(dto, currentUser);
  }

  @ApiOperation({
    summary: 'Lists support tickets (users see their own; SUPER_ADMIN sees all)',
  })
  @ApiResponse({
    status: 200,
    description: 'Support ticket list returned successfully',
  })
  @Get()
  list(@CurrentUser() currentUser: User) {
    return this.listSupportTicketsUseCase.execute(currentUser);
  }

  @ApiOperation({
    summary: 'Gets a paginated and filtered support ticket list',
  })
  @Get('search')
  search(@Query() query: ListSupportTicketsQueryDto, @CurrentUser() currentUser: User) {
    return this.searchSupportTicketsUseCase.execute(query, currentUser);
  }

  @ApiOperation({ summary: 'Gets a support ticket by identifier' })
  @ApiResponse({
    status: 200,
    description: 'Support ticket found successfully',
  })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.getSupportTicketUseCase.execute(id, currentUser);
  }

  @ApiOperation({
    summary: 'Edits the subject or description of an open support ticket',
  })
  @ApiResponse({
    status: 200,
    description: 'Support ticket updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Support ticket is no longer open' })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupportTicketDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateSupportTicketUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Answers a support ticket, restricted to SUPER_ADMIN',
  })
  @ApiResponse({
    status: 200,
    description: 'Support ticket answered successfully',
  })
  @ApiResponse({ status: 400, description: 'Support ticket is already closed' })
  @ApiResponse({
    status: 403,
    description: 'Permission denied to answer support tickets',
  })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Patch(':id/answer')
  answer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnswerSupportTicketDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.answerSupportTicketUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Closes a support ticket' })
  @ApiResponse({
    status: 200,
    description: 'Support ticket closed successfully',
  })
  @ApiResponse({ status: 400, description: 'Support ticket is already closed' })
  @ApiResponse({
    status: 403,
    description: 'Permission denied to close this support ticket',
  })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  @Patch(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.closeSupportTicketUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Reopens a closed support ticket' })
  @Patch(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.reopenSupportTicketUseCase.execute(id, currentUser);
  }
}
