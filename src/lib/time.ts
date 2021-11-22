// formats time since `time` in a `x seconds/minutes ago` format
export const formatFromNow = (time: number): string => {
    // difference in seconds
    const diff = Math.floor((Date.now() - time) / 1000);
    if(diff < 60)
        return `${diff} second${diff !== 1 ? 's' : ''} ago`
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
}