import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { TaskPriority } from './enums/task-priority.enum';
import { TaskStatus } from './enums/task-status.enum';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

const getControllerMethod = (methodName: keyof TasksController) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    TasksController.prototype,
    methodName,
  );

  if (!descriptor) {
    throw new Error(`Missing TasksController method: ${String(methodName)}`);
  }

  return descriptor.value as object;
};

const accessActor = {
  role: AreaRole.PRESIDENCIA,
  memberId: '1',
};

describe('TasksController', () => {
  let controller: TasksController;

  const tasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    setAssignees: jest.fn(),
    addComment: jest.fn(),
    findComments: jest.fn(),
    findStatusHistory: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: tasksService },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn().mockResolvedValue(null),
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(TasksController);
  });

  it('creates tasks through the service', async () => {
    const dto = {
      projectId: 1,
      title: 'Implementar endpoint',
      priority: TaskPriority.HIGH,
      assigneeIds: [2],
    };
    const task = { id: 1, ...dto, status: TaskStatus.TODO };

    tasksService.create.mockResolvedValue(task);

    await expect(controller.create(dto, accessActor)).resolves.toEqual(task);
    expect(tasksService.create).toHaveBeenCalledWith(dto, accessActor);
  });

  it('lists tasks through the service', async () => {
    const filter = { projectId: 1, status: TaskStatus.TODO };
    const response = {
      data: [],
      meta: { total: 0, page: 1, limit: 10, lastPage: 0 },
    };

    tasksService.findAll.mockResolvedValue(response);

    await expect(controller.findAll(filter, accessActor)).resolves.toEqual(
      response,
    );
    expect(tasksService.findAll).toHaveBeenCalledWith(filter, accessActor);
  });

  it('gets task detail through the service', async () => {
    tasksService.findOne.mockResolvedValue({ id: 1 });

    await expect(controller.findOne(1, accessActor)).resolves.toEqual({
      id: 1,
    });
    expect(tasksService.findOne).toHaveBeenCalledWith(1, accessActor);
  });

  it('updates task fields through the service', async () => {
    const dto = { title: 'Endpoint actualizado' };

    tasksService.update.mockResolvedValue({ id: 1, ...dto });

    await expect(controller.update(1, dto, accessActor)).resolves.toEqual({
      id: 1,
      ...dto,
    });
    expect(tasksService.update).toHaveBeenCalledWith(1, dto, accessActor);
  });

  it('changes task status through the service', async () => {
    const dto = { status: TaskStatus.IN_PROGRESS };

    tasksService.updateStatus.mockResolvedValue({ id: 1, ...dto });

    await expect(controller.updateStatus(1, dto, accessActor)).resolves.toEqual(
      { id: 1, ...dto },
    );
    expect(tasksService.updateStatus).toHaveBeenCalledWith(1, dto, accessActor);
  });

  it('reassigns task members through the service', async () => {
    const dto = { memberIds: [2, 3] };

    tasksService.setAssignees.mockResolvedValue({ id: 1 });

    await expect(controller.setAssignees(1, dto, accessActor)).resolves.toEqual(
      { id: 1 },
    );
    expect(tasksService.setAssignees).toHaveBeenCalledWith(1, dto, accessActor);
  });

  it('adds task comments through the service', async () => {
    const dto = { content: 'Listo para revisar.' };
    tasksService.addComment.mockResolvedValue({ id: 5, ...dto });

    await expect(controller.addComment(1, dto, accessActor)).resolves.toEqual({
      id: 5,
      ...dto,
    });
    expect(tasksService.addComment).toHaveBeenCalledWith(1, dto, accessActor);
  });

  it('lists task comments and status history through read-only endpoints', async () => {
    tasksService.findComments.mockResolvedValue([{ id: 1 }]);
    tasksService.findStatusHistory.mockResolvedValue([{ id: 2 }]);

    await expect(controller.findComments(1, accessActor)).resolves.toEqual([
      { id: 1 },
    ]);
    await expect(controller.findStatusHistory(1, accessActor)).resolves.toEqual(
      [{ id: 2 }],
    );
    expect(tasksService.findComments).toHaveBeenCalledWith(1, accessActor);
    expect(tasksService.findStatusHistory).toHaveBeenCalledWith(1, accessActor);
  });

  describe('access metadata', () => {
    it('uses RolesGuard at controller level', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        TasksController,
      ) as Array<new (...args: unknown[]) => unknown>;

      expect(guards).toContain(RolesGuard);
    });

    it.each([
      'create',
      'findAll',
      'findOne',
      'update',
      'updateStatus',
      'setAssignees',
      'addComment',
      'findComments',
      'findStatusHistory',
    ] as const)('declares authenticated roles for %s', (methodName) => {
      expect(
        Reflect.getMetadata(ROLES_KEY, getControllerMethod(methodName)),
      ).toEqual([
        AreaRole.PRESIDENCIA,
        AreaRole.DIRECTIVA_DE_AREA,
        AreaRole.MIEMBRO,
      ]);
    });
  });
});
