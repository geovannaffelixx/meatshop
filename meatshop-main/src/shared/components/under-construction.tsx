import React from "react";

type UnderConstructionProps = {
  title: string;
};

export function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600">{title}</h1>
        <p className="mt-4 text-xl text-gray-500">
          Esta página está sendo construída! Estamos trabalhando para trazer o conteúdo em breve.
        </p>
      </div>
    </div>
  );
}
