export const logger = ({ text, data }: { text: string; data: any }) => {
  console.log(`${text} ================>`, data);
};
