import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity('recipe_ingredients')
export class RecipeIngredient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipe_id: number;

  @ManyToOne(() => Recipe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  quantity: string;

  @Column({ type: 'varchar', nullable: true })
  tip: string | null;
}
