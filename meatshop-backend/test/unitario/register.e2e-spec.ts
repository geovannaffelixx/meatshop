import request from 'supertest';
import {Test} from '@nestjs/testing';
import {INestApplication} from '@nestjs/common';
import {AppModule} from '../../src/app.module';

describe('Fluxo de cadastro de produto', () => {

    let app: INestApplication;

    beforeAll(async() => {

        const moduleRef = await Test.createTestingModule({
 
            imports: [AppModule],

        }).compile();


        app = moduleRef.createNestApplication();

        await app.init();
        });
    
    afterAll(async () => {
      if (app) {
       await app.close();
        }
      });


    it('deve cadastrar produto', async() => {


     const dto = {
       status: 'ACTIVE',
       name: 'Picanha-teste',
       category: 'Bovina',
       cut: '',
       quantity: '-10',
       price: '-100',
       description: 'Produto teste'

     };

     const response = await request(app.getHttpServer())
       .post('/products')
       .send(dto);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');

  });

});
