import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Wallet, Plus, Minus, Users, ChevronRight, Clock, CheckCircle2, ShoppingBag, Smartphone, Send } from 'lucide-react';
import { api } from '../lib/api';
import type { MenuItem } from '../types';

interface CheckoutProps {
  item: MenuItem | null;
  onBack: () => void;
  onOrderPlaced: () => void;
}

export default function StudentCheckout({ item, onBack, onOrderPlaced }: CheckoutProps) {
  const [quantity, setQuantity] = useState(1);
  const [isGroupOrder, setIsGroupOrder] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  const [selectedTime, setSelectedTime] = useState('asap');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'upi' | 'parents'>('wallet');

  // Fallback item if none provided
  const orderItem = item || {
    id: '2',
    name: 'Burger Deluxe',
    price: 180.00,
    dietary: 'Non-Veg' as const,
    allergens: [],
    status: 'Available' as const,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=200',
    rating: 4.7,
    reviews: 35,
    prepTime: '20-35 min',
    distance: '2.5 km',
  };

  const total = orderItem.price * quantity;

  useEffect(() => {
    api.getBalance().then(b => setBalance(b));
  }, []);

  const handlePlaceOrder = async () => {
    if (isOrdering) return;
    setIsOrdering(true);

    try {
      const result = await api.placeOrder(
        [{
          id: orderItem.id,
          name: orderItem.name,
          price: orderItem.price,
          quantity,
          image: orderItem.image,
          dietary: orderItem.dietary,
          healthLevel: (orderItem as any).healthLevel || 1,
        }],
        total,
        selectedTime === 'asap' ? undefined : selectedTime
      );

      if ('error' in result) {
        alert(`❌ ${result.error}`);
        return;
      }

      const pts = (result as any).pointsEarned || 10;
      alert(`✅ Order placed! You earned ${pts} reward points.`);
      onOrderPlaced();
    } catch (err: any) {
      console.error('Order placement failed:', err);
      alert(`❌ Order failed: ${err?.message || 'Please check your connection and try again.'}`);
    } finally {
      setIsOrdering(false);
    }
  };

  // Generate time options
  const now = new Date();
  const timeOptions = [
    { key: 'asap', label: `ASAP (~${new Date(now.getTime() + 20 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` },
    { key: 't1', label: new Date(now.getTime() + 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { key: 't2', label: new Date(now.getTime() + 60 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="flex justify-center items-center py-5 relative px-4 border-b border-white/5">
        <button onClick={onBack} className="absolute left-4 p-2 -ml-2 text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-white">Checkout</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-32">
        {/* Item */}
        <div className="space-y-4">
          <div className="bg-[#18181B] rounded-2xl p-4 flex items-center border border-white/5">
            <div className={`w-4 h-4 rounded-full border-4 mr-4 shrink-0 ${orderItem.dietary === 'Veg' ? 'border-emerald-500' : 'border-brand-text'}`}></div>
            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 mr-3">
              <img src={orderItem.image} alt={orderItem.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-white">{orderItem.name}</h3>
              <p className="text-[10px] text-slate-500">{orderItem.dietary}</p>
              <div className="font-bold mt-1 text-sm text-white">₹{orderItem.price.toFixed(2)}</div>
            </div>
            <div className="flex items-center bg-slate-900 rounded-full h-8 px-1">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-6 h-6 flex items-center justify-center text-slate-400 bg-slate-800 rounded-full transition-colors hover:text-white"><Minus size={14}/></button>
              <span className="w-8 text-center text-xs font-bold">{String(quantity).padStart(2, '0')}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-6 h-6 flex items-center justify-center text-white bg-slate-700 rounded-full transition-colors hover:bg-slate-600"><Plus size={14}/></button>
            </div>
          </div>
        </div>

        {/* Group Order Toggle */}
        <div className="bg-[#18181B] rounded-2xl p-5 border border-brand/30 relative overflow-hidden transition-all duration-300">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Users size={64} />
             </div>
             <div className="flex justify-between items-center mb-3">
               <div>
                 <h3 className="font-bold text-white text-sm">Group Order Sync</h3>
                 <p className="text-[10px] text-slate-400">Split bills automatically</p>
               </div>
               <button 
                  onClick={() => setIsGroupOrder(!isGroupOrder)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isGroupOrder ? 'bg-brand' : 'bg-slate-700'}`}
               >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isGroupOrder ? 'left-7' : 'left-1.5'}`}></div>
               </button>
             </div>

             {isGroupOrder && (
               <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-slate-400">Rahul M. (You)</span>
                     <span className="text-white font-bold">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-slate-400">Priya K. (Pending)</span>
                     <span className="text-white font-bold">₹0.00</span>
                  </div>
                  <button className="w-full mt-2 py-2 border border-dashed border-slate-600 rounded-xl text-xs text-sky-500 font-bold hover:bg-sky-500/10 transition-colors">
                    + Add Friend from Contacts
                  </button>
               </div>
             )}
        </div>

        {/* Pre-order Schedule */}
        <div>
          <div className="flex justify-between mb-2">
             <h3 className="font-bold text-sm text-white">Pre-order Details</h3>
          </div>
          <div className="bg-[#18181B] rounded-2xl p-4 border border-white/5 space-y-4">
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Est. Preparation Time</span>
                <span className="text-white font-bold text-sky-500">15-20 mins</span>
             </div>
             <div className="h-px bg-slate-800 w-full my-2"></div>
             <div>
                <span className="text-slate-400 text-sm mb-3 block">Select Pickup Time</span>
                <div className="flex gap-2 relative overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
                   {timeOptions.map(opt => (
                     <button 
                       key={opt.key}
                       onClick={() => setSelectedTime(opt.key)}
                       className={`px-4 py-2 border rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                         selectedTime === opt.key 
                           ? 'border-brand bg-brand/10 text-brand-text' 
                           : 'border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-300'
                       }`}
                     >
                       {opt.label}
                     </button>
                   ))}
                   <button className="px-4 py-2 border border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors">
                      Custom <Clock size={12}/>
                   </button>
                </div>
             </div>
             <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-[10px] text-emerald-400 font-medium">
               <CheckCircle2 size={12} className="inline mr-1" />
               Vendor starts cooking at exactly the right time. Zero waste!
             </div>
          </div>
        </div>

        {/* Pickup Location */}
        <div>
          <div className="flex justify-between mb-2">
             <h3 className="font-bold text-sm text-white">Pickup Location</h3>
             <button className="text-xs text-sky-500 font-medium">Edit</button>
          </div>
          <div className="bg-white rounded-2xl p-4 flex items-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl relative mr-3 shrink-0 overflow-hidden">
               <img src="https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&q=80&w=200" alt="Map" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center backdrop-blur-[1px]">
                 <div className="bg-white text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm relative z-10 -mt-2">Home</div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-1">
                   <MapPin size={14} className="text-black fill-white" />
                 </div>
               </div>
            </div>
            <div>
              <p className="text-xs text-black font-medium leading-loose">Main CS Canteen</p>
              <p className="text-[10px] text-slate-500 font-medium">Pick up in 15-20 mins (Avoid Peak)</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <div className="flex justify-between mb-2">
             <h3 className="font-bold text-sm text-white">Payment Method</h3>
             <button className="text-xs text-sky-500 font-medium">Edit</button>
          </div>
          <div className="space-y-3">
            <div 
              onClick={() => setPaymentMethod('wallet')}
              className={`rounded-2xl p-4 flex items-center justify-between border cursor-pointer transition-all ${
                paymentMethod === 'wallet' ? 'bg-slate-800/80 border-slate-500 shadow-md' : 'bg-[#18181B] border-white/5 hover:bg-slate-900/50'
              }`}
            >
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'wallet' ? 'bg-white text-black' : 'bg-slate-800/80 text-slate-400'}`}>
                    <Wallet size={18} />
                 </div>
                 <div>
                    <p className={`text-sm font-bold ${paymentMethod === 'wallet' ? 'text-white' : 'text-slate-300'}`}>Campus Wallet</p>
                    <p className={`text-xs ${paymentMethod === 'wallet' && balance < total ? 'text-amber-500 font-bold' : 'text-slate-500'}`}>
                      Bal: ₹{balance.toFixed(2)} {paymentMethod === 'wallet' && balance < total && '— Insufficient!'}
                    </p>
                 </div>
               </div>
               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'wallet' ? 'border-white' : 'border-slate-700'}`}>
                 {paymentMethod === 'wallet' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
               </div>
            </div>

            <div 
              onClick={() => setPaymentMethod('upi')}
              className={`rounded-2xl p-4 flex items-center justify-between border cursor-pointer transition-all ${
                paymentMethod === 'upi' ? 'bg-slate-800/80 border-slate-500 shadow-md' : 'bg-[#18181B] border-white/5 hover:bg-slate-900/50'
              }`}
            >
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'upi' ? 'bg-white text-black' : 'bg-slate-800/80 text-slate-400'}`}>
                    <Smartphone size={18} />
                 </div>
                 <div>
                    <p className={`text-sm font-bold ${paymentMethod === 'upi' ? 'text-white' : 'text-slate-300'}`}>UPI / Net Banking</p>
                    <p className="text-xs text-slate-500">Google Pay, PhonePe, Paytm</p>
                 </div>
               </div>
               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'upi' ? 'border-white' : 'border-slate-700'}`}>
                 {paymentMethod === 'upi' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
               </div>
            </div>

            <div 
              onClick={() => setPaymentMethod('parents')}
              className={`rounded-2xl p-4 flex items-center justify-between border cursor-pointer transition-all ${
                paymentMethod === 'parents' ? 'bg-slate-800/80 border-slate-500 shadow-md' : 'bg-[#18181B] border-white/5 hover:bg-slate-900/50'
              }`}
            >
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'parents' ? 'bg-white text-black' : 'bg-slate-800/80 text-slate-400'}`}>
                    <Send size={18} />
                 </div>
                 <div>
                    <p className={`text-sm font-bold ${paymentMethod === 'parents' ? 'text-white' : 'text-slate-300'}`}>Notify Parents</p>
                    <p className="text-xs text-slate-500">Send an SMS payment link</p>
                 </div>
               </div>
               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'parents' ? 'border-white' : 'border-slate-700'}`}>
                 {paymentMethod === 'parents' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
               </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full md:absolute md:w-[448px] bg-slate-950 border-t border-slate-900 p-4 pb-safe space-y-3 z-50">
         <div className="flex justify-between items-center px-2">
           <span className="text-sm font-medium text-slate-400">Total ({quantity} item{quantity > 1 ? 's' : ''})</span>
           <span className="text-xl font-bold text-white">₹{total.toFixed(2)}</span>
         </div>
         <button 
           onClick={handlePlaceOrder}
           disabled={isOrdering || (paymentMethod === 'wallet' && balance < total)}
           className={`w-full font-bold py-4 rounded-2xl text-sm transition-all text-center flex items-center justify-center gap-2 shadow-lg ${
             isOrdering ? 'bg-slate-700 text-slate-400 cursor-wait' :
             (paymentMethod === 'wallet' && balance < total) ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none' :
             'bg-white hover:bg-slate-200 text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
           }`}
         >
           {isOrdering ? (
             <>Processing...</>
           ) : paymentMethod === 'wallet' && balance < total ? (
             <>Insufficient Balance — Top Up First</>
           ) : paymentMethod === 'upi' ? (
             <><Smartphone size={16} /> Pay via UPI (₹{total.toFixed(2)})</>
           ) : paymentMethod === 'parents' ? (
             <><Send size={16} /> Send Link to Parents</>
           ) : (
             <><ShoppingBag size={16} /> Pay via Wallet (₹{total.toFixed(2)})</>
           )}
         </button>
      </div>
    </div>
  );
}
