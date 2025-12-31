'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
});

function Docs() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    async function fetchSpec() {
      const response = await fetch('/api/swagger.json');
      const data = await response.json();
      setSpec(data);
    }

    fetchSpec();
  }, []);

  if (!spec) {
    return <div>Loading documentation...</div>;
  }

  return <SwaggerUI spec={spec} />;
}

export default Docs;
