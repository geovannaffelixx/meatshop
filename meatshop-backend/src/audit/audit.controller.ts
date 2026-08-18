import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { FilterAuditLogDto } from './dtos/filter-audit-log.dto';
import { ListAuditLogsUseCase } from './use-cases/list-audit-logs.use-case';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly listAuditLogsUseCase: ListAuditLogsUseCase) {}

  @ApiOperation({
    summary:
      'Lista os logs de auditoria de todas as unidades (restrito a SUPER_ADMIN)',
    description:
      'Registro automático de toda operação de criação/atualização/remoção feita na API — quem fez, em qual entidade, e os dados antes/depois.',
  })
  @ApiResponse({ status: 200, description: 'Lista de logs retornada com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão para consultar logs de auditoria' })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Get()
  list(@Query() filters: FilterAuditLogDto) {
    return this.listAuditLogsUseCase.execute(filters);
  }
}
