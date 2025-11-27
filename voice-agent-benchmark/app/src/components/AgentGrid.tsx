import { AgentCard } from './AgentCard';
import { useAppStore } from '../store';

export function AgentGrid() {
  const { session } = useAppStore();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {session.agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
