import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface AutoReplyLog {
    id: string;
    patientName: string;
    message: string;
    time: string;
    type: 'price' | 'appointment' | 'generic';
}

export function useAutoReply() {
    const [replyLogs, setReplyLogs] = useState<AutoReplyLog[]>([]);

    const processMessage = useCallback((patientName: string, text: string) => {
        const lowerText = text.toLowerCase();
        // Human-like Delay: 30-90 seconds (Random)
        // "Müşteri asla 'anında cevap geldi' dememeli."
        const delay = Math.floor(Math.random() * (90000 - 30000 + 1) + 30000);

        // Determine reply type & Tone
        let type: AutoReplyLog['type'] = 'generic';
        let replyText = "Mesajını aldım! Sabah kahvemi içer içmez sana dönüyorum. ☕";

        if (lowerText.includes('fiyat') || lowerText.includes('ne kadar') || lowerText.includes('price') || lowerText.includes('cost')) {
            type = 'price';
            replyText = "Selam! Şu an bilgisayar başında değilim ama fiyat listemizi şuraya bırakıyorum, sabah detayları konuşuruz! 🌙 [Link]";
        } else if (lowerText.includes('randevu') || lowerText.includes('yer var mı') || lowerText.includes('book') || lowerText.includes('appointment')) {
            type = 'appointment';
            replyText = "Harika bir karar! Sabah ilk iş takvime bakıp sana döneceğim. Şimdilik iyi geceler! ⭐";
        }

        // Simulate Network Delay & Reply
        setTimeout(() => {
            const log: AutoReplyLog = {
                id: Date.now().toString(),
                patientName,
                message: replyText,
                time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                type
            };

            setReplyLogs(prev => [log, ...prev]);

            // Toast Notification for the Consultant (Twin Feed)
            toast.custom((t) => (
                <div className= "bg-indigo-900 text-indigo-100 p-4 rounded-lg shadow-xl border border-indigo-700 flex items-center gap-3 w-80" >
                <div className="w-10 h-10 rounded-full bg-indigo-800 flex items-center justify-center flex-shrink-0 animate-pulse" >
            <span className="text-xl" >🤖</span>
            </div>
            < div >
            <h4 className="font-bold text-sm" > AI Twin Auto - Reply </h4>
            < p className = "text-xs text-indigo-300 mt-1" >
            Replied to { patientName }: "{replyText.substring(0, 30)}..."
            </p>
            < span className = "text-[10px] text-indigo-400 mt-2 block" > { log.time } </span>
            </div>
            </div>
            ), { duration: 5000 });

    }, delay);

}, []);

return {
    replyLogs,
    processMessage
};
}
