import type {HTMLAttributes} from "react";
import "./item-card.css";

/** A quiet white list item. Keep the primary link/button separate from secondary actions. */
export function ItemCard({as:Tag="div",className="",...props}:HTMLAttributes<HTMLElement>&{as?:"div"|"li"|"article"}){
 return <Tag {...props} className={`item-card ${className}`.trim()}/>;
}
