import axios, { AxiosError } from "axios";

class Flutterwave {
  private baseUrl: string;
  private secretKey: string;
  private publicKey: string;
  private Axios = axios.create({});

  constructor() {
    this.baseUrl = "https://api.flutterwave.com/v3";
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY! as string;
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY! as string;

    this.Axios.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${this.secretKey}`;
    this.Axios.defaults.baseURL = this.baseUrl;
  }

  resolveBvn = async (bvn: string): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (bvn.length !== 11) {
          return reject({
            message: "Invalid bvn",
            status: "error",
          });
        }
        const { data } = await this.Axios.get(`/kyc/bvns/${bvn}`);

        if (data.status === "success") {
          return resolve(data.data);
        } else {
          return reject({
            message: data.message ?? "Unable to resolve bvn",
            status: data.status ?? "error",
          });
        }
      } catch (err: any) {
        console.log("flutterwave:", err);
        return reject({
          message: err.response.data.message ?? "Unable to resolve bvn",
          status: err.response.status ?? "error",
        });
      }
    });
  };

  resolveAccountNumber = async (
    accounNumber: string,
    bank: string
  ): Promise<{
    status: string;
    message: string;
    data?: {
      account_number: string;
      account_name: string;
    };
  }> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (accounNumber.length !== 10) {
          return reject({
            message: "Invalid account number",
            status: "error",
          });
        }
        const { data } = await this.Axios.post(`/accounts/resolve/`, {
          account_number: accounNumber,
          account_bank: bank,
        });

        if (data.status === "success") {
          return resolve(data);
        }

        return reject({
          message: data.message ?? "Unable to resolve account number",
          status: data.status ?? "error",
        });
      } catch (err) {
        console.log("flutterwave:", err);
        return reject(err);
      }
    });
  };

  initiateBVNConsent = async ({
    bvn,
    firstname,
    lastname,
    redirectUrl,
  }: {
    bvn: string;
    firstname: string;
    lastname: string;
    redirectUrl: string;
  }): Promise<{
    status: string;
    message: string;
    data?: {
      url: string;
      reference: string;
    };
  }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const { data } = await this.Axios.post(`/bvn/verifications`, {
          bvn,
          firstname,
          lastname,
          redirect_url: redirectUrl,
        });

        if (data.status === "success") {
          return resolve(data);
        } else {
          return reject({
            message: data.message ?? "Unable to initiate bvn consent",
            status: data.status ?? "error",
          });
        }
      } catch (err: any) {
        console.log("flutterwave:", err);
        return reject({
          message: "Unable to get banks",
          status: err.response.data.status ?? "error",
        });
      }
    });
  };

  getBanks = async (): Promise<{
    status: string;
    message: string;
    data?: Array<{
      id: number;
      name: string;
      code: string;
    }>;
  }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const { data } = await this.Axios.get(`/banks/NG`);
        if (data.status === "success") {
          return resolve(data);
        } else {
          return reject({
            message: "Unable to get banks",
            status: data.status,
          });
        }
      } catch (err: any) {
        console.log("flutterwave:", err);
        return reject({
          message: "Unable to get banks",
          status: err.response.data.status ?? "error",
        });
      }
    });
  };

  createVirtualAccountNumber = async ({
    email,
    bvn,
    isPermanent = true,
  }: {
    email: string;
    bvn: string;
    isPermanent?: boolean;
  }): Promise<{
    status: string;
    message: string;
    data?: any;
  }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const { data } = await this.Axios.post(`/virtual-account-numbers`, {
          email,
          bvn,
          is_permanent: isPermanent,
        });
        if (data.status === "success") {
          return resolve(data);
        } else {
          return reject({
            message: "Unable to get banks",
            status: data.status,
          });
        }
      } catch (err: any) {
        console.log("flutterwave:", err);
        return reject({
          message: "Unable to get banks",
          status: err.response.data.status ?? "error",
        });
      }
    });
  };

  //   createVirtualCard = async (): Promise<{}> => {};
}

export default Flutterwave;
