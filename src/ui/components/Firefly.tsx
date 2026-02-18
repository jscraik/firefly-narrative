import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

export type FireflyState = 'idle' | 'tracking' | 'analyzing' | 'insight';

interface FireflyProps extends ComponentPropsWithoutRef<'div'> {
    state?: FireflyState;
}

export function Firefly({ state = 'idle', className, style, ...props }: FireflyProps) {
    return (
        <div
            className={clsx('firefly', className)}
            data-state={state}
            style={style}
            {...props}
        >
            <div
                className={clsx(
                    'firefly-orb',
                    state === 'idle' && 'animate-firefly-idle',
                    state === 'tracking' && 'animate-firefly-tracking',
                    state === 'analyzing' && 'animate-firefly-analyzing',
                    state === 'insight' && 'animate-firefly-insight'
                )}
            />
            <div className="firefly-wings">
                <div className="firefly-wing left" />
                <div className="firefly-wing right" />
            </div>
        </div>
    );
}
