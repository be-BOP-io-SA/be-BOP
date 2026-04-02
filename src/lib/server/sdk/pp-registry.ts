import { registerProcessor } from './pp';
import PPSumUp from './contrib/PPSumUp';
import PPStripe from './contrib/PPStripe';
import PPSwissBitcoinPay from './contrib/PPSwissBitcoinPay';
import PPBtcpayServer from './contrib/PPBtcpayServer';
import PPPhoenixd from './contrib/PPPhoenixd';
import PPLnd from './contrib/PPLnd';
import PPBitcoinNodeless from './contrib/PPBitcoinNodeless';
import PPBitcoind from './contrib/PPBitcoind';
import PPPaypal from './contrib/PPPaypal';

// Registration order = default priority per method (when no user preference set)

// card: sumup → stripe (matches orders.ts hardcodedPriority)
registerProcessor(PPSumUp);
registerProcessor(PPStripe);

// lightning: swiss-bitcoin-pay → btcpay-server → phoenixd → lnd
registerProcessor(PPSwissBitcoinPay);
registerProcessor(PPBtcpayServer);
registerProcessor(PPPhoenixd);
registerProcessor(PPLnd);

// bitcoin: bitcoin-nodeless → bitcoind
registerProcessor(PPBitcoinNodeless);
registerProcessor(PPBitcoind);

// paypal: single provider
registerProcessor(PPPaypal);
