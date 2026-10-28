/* global jest */
import { ListAuditLogsUseCase } from './list-audit-logs.use-case';

describe('Audit pagination', () => {
  it('fetches ten rows by default and applies the offset before reading the database', async () => {
    const query = Object.fromEntries(
      ['leftJoinAndSelect', 'select', 'orderBy', 'addOrderBy', 'skip', 'take'].map((name) => [
        name,
        jest.fn().mockReturnThis(),
      ]),
    );
    query.getManyAndCount = jest.fn().mockResolvedValue([[{ id: 11 }], 25]);
    const repository = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const service = new ListAuditLogsUseCase(repository as never);
    const result = await service.execute({ page: 2 });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.take).toHaveBeenCalledWith(10);
    expect(query.addOrderBy).toHaveBeenCalledWith('audit.id', 'DESC');
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
  });
});
