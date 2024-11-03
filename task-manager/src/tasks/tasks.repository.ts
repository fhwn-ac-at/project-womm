import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { Task } from 'src/workflows/entities/task.entity';

@Injectable()
export class TasksRepository {



  constructor(
    @InjectKnex() private readonly knex: Knex
  ) {}

  public async findAll() {

  }

  public async save(task: Task, transaction: Knex.Transaction) {
  }

}

