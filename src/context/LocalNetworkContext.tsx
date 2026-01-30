import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LocalNetworkContextType {
    isLocal: boolean;
    isLoading: boolean;
}

const LocalNetworkContext = createContext<LocalNetworkContextType | undefined>(undefined);

export function LocalNetworkProvider({ children }: { children: ReactNode }) {
    const [isLocal, setIsLocal] = useState(true); // Default to true to avoid flash of banner
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkNetwork() {
            try {
                const response = await fetch('/api/is-local');
                if (response.ok) {
                    const data = await response.json();
                    setIsLocal(data.isLocal);
                    console.log(`Network check: isLocal=${data.isLocal}, clientIp=${data.clientIp}`);
                }
            } catch (error) {
                console.error('Failed to check network status:', error);
                // Default to local on error (fail open for usability)
                setIsLocal(true);
            } finally {
                setIsLoading(false);
            }
        }

        checkNetwork();
    }, []);

    return (
        <LocalNetworkContext.Provider value={{ isLocal, isLoading }}>
            {children}
        </LocalNetworkContext.Provider>
    );
}

export function useLocalNetwork(): LocalNetworkContextType {
    const context = useContext(LocalNetworkContext);
    if (context === undefined) {
        throw new Error('useLocalNetwork must be used within a LocalNetworkProvider');
    }
    return context;
}
