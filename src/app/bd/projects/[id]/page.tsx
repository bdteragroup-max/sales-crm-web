import ProjectDetailClientPage from './ProjectDetailClientPage';

export const metadata = {
  title: 'BD Project Details',
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ProjectDetailClientPage id={resolvedParams.id} />;
}
