'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

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
