import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity('recipe_steps')
export class RecipeStep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipe_id: number;

  @ManyToOne(() => Recipe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Column({ type: 'int' })
  step_number: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  tip: string | null;
}
