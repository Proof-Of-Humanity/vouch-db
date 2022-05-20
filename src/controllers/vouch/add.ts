import { RequestHandler } from 'express';
import Joi from '@hapi/joi';
// eslint-disable-next-line camelcase
import { recoverTypedSignature_v4, TypedDataUtils } from 'eth-sig-util';
import { ethers } from 'ethers';
import requestMiddleware from '../../middleware/request-middleware';
import { Vouch } from '../../models';
import pohAbi from '../../abis/proof-of-humanity.json';
import logger from '../../logger';

const addVouchSchema = Joi.object().keys({
  signature: Joi.string().required(),
  msgData: Joi.string().required(),
  voucherAddress: Joi.string().required(),
});

const provider = new ethers.providers.InfuraProvider('homestead', process.env.INFURA_KEY);
const poh = new ethers.Contract(process.env.POH_ADDRESS, pohAbi, provider);
const eip1271Abi = `[{"constant":true,"inputs":[{"name":"_messageHash","type":"bytes32"},{"name":"_signature","type":"bytes"}],"name":"isValidSignature","outputs":[{"name":"magicValue","type":"bytes4"}],"payable":false,"stateMutability":"view","type":"function"}]`;

// Returns true if the contract wallet considers the signature valid (EIP-1271)
async function isValidEIP1271Signature(msgData: Buffer, signature: string, walletAddress: string): Promise<boolean> {
  const eip1271Contract = new ethers.Contract(walletAddress, eip1271Abi, provider);
  try {
    const retVal = await eip1271Contract.isValidSignature(msgData, signature);
    return retVal == 0x1626ba7e;
  } catch (error) {
    return false;
  }
}

const add: RequestHandler = async (req, res) => {
  const {
    signature,
    msgData: msgDataString,
    voucherAddress
  } = req.body;
  const msgData = JSON.parse(msgDataString);

  const { message } = msgData || {};
  const {
    vouchedSubmission: submissionId,
    voucherExpirationTimestamp: expirationTimestamp
  } = message || {};

  let voucherAddr = recoverTypedSignature_v4({
    data: msgData,
    sig: signature
  });

  if (voucherAddr.toUpperCase() != voucherAddress.toUpperCase()) {
    // If the address is a smart contract wallet, check for EIP-1271 support
    const theMsgHash = TypedDataUtils.sign(msgData);
    const validSig = await isValidEIP1271Signature(theMsgHash, signature, voucherAddress);
    if (!validSig) { 
      logger.error("Invalid signature");
      res.status(400).json({
        message: "Invalid signature.",
      });
      return;
    }

    // Contract verified the sig, allow the voucher address to be used
    voucherAddr = voucherAddress;
  }

  if (!(await poh.isRegistered(voucherAddr))) {
    res.status(400).json({
      message: 'Voucher not registered.'
    });
    return;
  }

  let vouch = await Vouch.findOne({ submissionId });
  if (!vouch) {
    vouch = new Vouch({
      submissionId,
      vouchers: [voucherAddr],
      signatures: [signature],
      expirationTimestamps: [expirationTimestamp],
      vouchersLength: 1
    });
  } else if (!vouch.vouchers.includes(voucherAddr)) {
    vouch.signatures = [...vouch.signatures, signature];
    vouch.vouchers = [...vouch.vouchers, voucherAddr];
    vouch.expirationTimestamps = [...vouch.expirationTimestamps, expirationTimestamp];
    vouch.vouchersLength += 1;
  }

  await vouch.save();

  res.json({
    message: 'Saved',
    vouch: vouch.toJSON()
  });
};

export default requestMiddleware(add, { validation: { body: addVouchSchema } });
