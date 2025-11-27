import { Header, AgentGrid, InputControls, ConfigPanel } from './components';
import { useAppStore } from './store';

function App() {
  const { isDarkMode } = useAppStore();

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-950' : 'bg-gray-100'}`}>
      <Header />

      <main className="flex-1 overflow-y-auto">
        <AgentGrid />
      </main>

      <InputControls />

      <ConfigPanel />
    </div>
  );
}

export default App;
