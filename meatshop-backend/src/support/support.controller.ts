import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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

  @ApiOperation({ summary: 'Abre um novo chamado de suporte' })
  @ApiResponse({ status: 201, description: 'Chamado criado com sucesso' })
  @Post()
  create(@Body() dto: CreateSupportTicketDto, @CurrentUser() currentUser: User) {
    return this.createSupportTicketUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Lista os chamados de suporte (o usuário vê os próprios; SUPER_ADMIN vê todos)' })
  @ApiResponse({ status: 200, description: 'Lista de chamados retornada com sucesso' })
  @Get()
  list(@CurrentUser() currentUser: User) {
    return this.listSupportTicketsUseCase.execute(currentUser);
  }

  @ApiOperation({ summary: 'Consulta paginada e filtrada de chamados' })
  @Get('search')
  search(@Query() query: ListSupportTicketsQueryDto, @CurrentUser() currentUser: User) {
    return this.searchSupportTicketsUseCase.execute(query, currentUser);
  }

  @ApiOperation({ summary: 'Busca um chamado de suporte pelo identificador' })
  @ApiResponse({ status: 200, description: 'Chamado encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Chamado não encontrado' })
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.getSupportTicketUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Edita o assunto/descrição de um chamado ainda aberto' })
  @ApiResponse({ status: 200, description: 'Chamado atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Chamado não está mais aberto' })
  @ApiResponse({ status: 404, description: 'Chamado não encontrado' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupportTicketDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateSupportTicketUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Responde um chamado de suporte (restrito a SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Chamado respondido com sucesso' })
  @ApiResponse({ status: 400, description: 'Chamado já está encerrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para responder chamados' })
  @ApiResponse({ status: 404, description: 'Chamado não encontrado' })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Patch(':id/answer')
  answer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnswerSupportTicketDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.answerSupportTicketUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Encerra um chamado de suporte' })
  @ApiResponse({ status: 200, description: 'Chamado encerrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Chamado já está encerrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para encerrar este chamado' })
  @ApiResponse({ status: 404, description: 'Chamado não encontrado' })
  @Patch(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.closeSupportTicketUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Reabre um chamado encerrado' })
  @Patch(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.reopenSupportTicketUseCase.execute(id, currentUser);
  }
}
