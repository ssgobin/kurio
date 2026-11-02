import type {ComponentPropsWithoutRef} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';import {X} from 'lucide-react';import {cn} from '../../lib/utils';
export const Dialog=DialogPrimitive.Root;export const DialogTrigger=DialogPrimitive.Trigger;export const DialogClose=DialogPrimitive.Close;
export function DialogContent({className,children,onCloseAutoFocus,...props}:ComponentPropsWithoutRef<typeof DialogPrimitive.Content>){
  const restoreFocus:NonNullable<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>['onCloseAutoFocus']>=event=>{
    onCloseAutoFocus?.(event);
    if(event.defaultPrevented)return;
    const trigger=document.querySelector<HTMLButtonElement>('button[aria-label="Abrir filtros"]');
    if(trigger){event.preventDefault();trigger.focus()}
  };
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70"/><DialogPrimitive.Content className={cn('fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border border-border bg-surface p-5 text-foreground shadow-2xl focus:outline-none',className)} onCloseAutoFocus={restoreFocus} {...props}>{children}<DialogPrimitive.Close aria-label="Fechar" className="absolute right-3 top-3 rounded-md p-2 text-secondary hover:bg-raised"><X size={18}/></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>
}
export const DialogTitle=DialogPrimitive.Title;export const DialogDescription=DialogPrimitive.Description;
