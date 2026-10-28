/* global jest */
import { ListUnitDeliveryPeopleUseCase } from './list-unit-delivery-people.use-case';
import { PanelListQueryDto } from '../../common/dtos/panel-list-query.dto';

describe('Unit delivery people pagination', () => {
  function setup() {
    const query = Object.fromEntries(
      ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'skip', 'take'].map(
        (name) => [name, jest.fn().mockReturnThis()],
      ),
    );
    query.getManyAndCount = jest.fn().mockResolvedValue([
      [
        {
          id: 11,
          user_id: 99,
          status: 'ACTIVE',
          user: { id: 99, name: 'Courier', email: 'courier@example.com' },
        },
      ],
      21,
    ]);
    const memberships = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const people = { find: jest.fn().mockResolvedValue([]) };
    const vehicles = { find: jest.fn() };
    const orders = { find: jest.fn() };
    const authorization = { assertHasPermission: jest.fn().mockResolvedValue(undefined) };
    const service = new ListUnitDeliveryPeopleUseCase(
      memberships as never,
      people as never,
      vehicles as never,
      orders as never,
      authorization as never,
    );
    return { query, people, service, authorization };
  }

  it('pages memberships in the database and enriches only the selected page', async () => {
    const { service, query, people, authorization } = setup();
    const filters = Object.assign(new PanelListQueryDto(), {
      paginated: 'true',
      page: 2,
      search: 'Courier',
    });
    const result = await service.execute(7, {} as never, filters);
    expect(authorization.assertHasPermission).toHaveBeenCalled();
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.take).toHaveBeenCalledWith(10);
    expect(query.andWhere).toHaveBeenCalledWith(
      '(user.name ILIKE :search OR user.email ILIKE :search)',
      { search: '%Courier%' },
    );
    expect(people.find.mock.calls[0][0].where.user_id.value).toEqual([99]);
    expect(result).toMatchObject({
      data: [{ membershipId: 11, user: { id: 99 } }],
      meta: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });
  });

  it('preserves the complete list contract for the order assignment selector', async () => {
    const { service, query } = setup();
    const result = await service.execute(7, {} as never);
    expect(Array.isArray(result)).toBe(true);
    expect(query.skip).not.toHaveBeenCalled();
    expect(query.take).not.toHaveBeenCalled();
  });
});
