import React, { useEffect, useState } from 'react';
import { fetchDependencies } from '../services/api';

const DependencyGraph: React.FC = () => {
    const [dependencies, setDependencies] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDependencies = async () => {
            try {
                const data = await fetchDependencies();
                setDependencies(data);
            } catch (err) {
                setError('Failed to load dependencies');
            } finally {
                setLoading(false);
            }
        };

        loadDependencies();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="dependency-graph">
            <h2>Dependency Graph</h2>
            <ul>
                {dependencies.map(dep => (
                    <li key={dep.id}>
                        Task {dep.predecessor_id} → Task {dep.successor_id}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DependencyGraph;