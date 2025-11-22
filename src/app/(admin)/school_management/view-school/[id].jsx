import React from 'react'
import PageHeader from '@/components/PageHeader';
import { useParams } from 'next/navigation';

function Page() {
    const { id } = useParams();
  return (
    <>
        <PageHeader HeaderText={`School Details - ID: ${id}`} SubHeaderText="View and manage the details of the selected school." />
    </>
  )
}

export default Page