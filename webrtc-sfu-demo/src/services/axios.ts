import axios, { AxiosRequestHeaders } from 'axios'
export default function ajax({
 url = "",
 method = "get",
 data = {},
}) {
 const token = ''

 return new Promise((resolve, reject) => {
  let headers: AxiosRequestHeaders = {
   "Content-Type": "application/json",
   "token": `{Authorization: Bearer ${token} }` || "{}"
  }

  const instance = axios.create({
   headers,
   baseURL: import.meta.env.VITE_HTTPSURL,
   timeout: 8000,
  });
  const applyInstance =
   method === "get"
    ? instance.get
    : method === "post"
     ? instance.post
     : method === "put"
      ? instance.put
      : instance.delete;

  applyInstance(url, data)
   .then((res) => {
    resolve(res);
   })
   .catch((err) => {
    // if (err.response.status === 401) { }
    reject(err);
   })
 });
}