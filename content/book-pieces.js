/** Route parameters can be absent during navigation; never treat ungrouped music as a book. */
export function orderedBookPieces(items,bookId){
 if(typeof bookId!=="string"||!bookId)return [];
 return items.filter(item=>item.book&&item.book.id===bookId&&Number.isFinite(item.book.number)).sort((a,b)=>a.book.number-b.book.number);
}
