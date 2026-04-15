import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    getCurrentUser: jest.Mock;
    updateCurrentUser: jest.Mock;
    changePassword: jest.Mock;
    getUserById: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      getCurrentUser: jest.fn(),
      updateCurrentUser: jest.fn(),
      changePassword: jest.fn(),
      getUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates getMe to users service', async () => {
    usersService.getCurrentUser.mockResolvedValue({ id: 'u1' });

    await expect(controller.getMe('u1')).resolves.toEqual({ id: 'u1' });
    expect(usersService.getCurrentUser).toHaveBeenCalledWith('u1');
  });
});
