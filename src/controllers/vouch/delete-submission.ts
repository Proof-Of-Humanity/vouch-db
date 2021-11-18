import Joi from "@hapi/joi";
import { recoverTypedSignature_v4 as recoverTypedSignatureV4 } from "eth-sig-util";
import { RequestHandler } from "express";
import requestMiddleware from "../../middleware/request-middleware";
import { Vouch } from "../../models";

const deleteVouchSchema = Joi.object().keys({
  submissionId: Joi.string(),
  signature: Joi.string(),
});

const deleteSubmission: RequestHandler = async (req, res) => {
  const { submissionId, signature } = req.body;

  if (!submissionId) {
    res.status(401).json({
      message: "No submissionId provided.",
    });
    return;
  }
  const normalizedSubmissionId = (submissionId as string).toLowerCase();

  const msgParams = {
    domain: {
      name: "Proof Of Humanity",
    },
    message: {
      claim: `Reapplying for proof of humanity. My address is ${normalizedSubmissionId}`,
    },
    primaryType: "Auth",
    types: {
      EIP712Domain: [{ name: "name", type: "string" }],
      Auth: [{ name: "claim", type: "string" }],
    },
  };

  const recoveredAddr = recoverTypedSignatureV4({
    data: msgParams as any,
    sig: signature as string,
  });

  if (!signature || normalizedSubmissionId !== recoveredAddr.toLowerCase()) {
    res.status(401).json({
      message: "Removal not authorized.",
    });
    return;
  }

  const vouches = await Vouch.findOneAndDelete({
    $expr: {
      $eq: [normalizedSubmissionId, "$submissionId"],
    },
  });
  res.json({ vouches });
};

export default requestMiddleware(deleteSubmission, {
  validation: { body: deleteVouchSchema },
});
