import type {HTMLAttributes} from 'react';
import {cn} from '../../lib/utils';
export function Skeleton({className,...props}:HTMLAttributes<HTMLDivElement>){return <div aria-hidden="true" className={cn('relative overflow-hidden rounded-md bg-raised before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-shimmer motion-reduce:before:animate-none',className)} {...props}/>}
