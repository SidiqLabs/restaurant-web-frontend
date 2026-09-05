// src/app/category/[slug]/page.tsx
import CategoryClient from './CategoryClient';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const CategoryPage = async ({ params }: PageProps) => {
  const { slug } = await params;

  return <CategoryClient slug={slug} />;
};

export default CategoryPage;
