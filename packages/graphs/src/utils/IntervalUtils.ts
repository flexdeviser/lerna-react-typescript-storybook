import { GraphCollection } from '../graph/Types';

export class IntervalUtils {
  // find best collection for current dateWindow
  static findBestCollection = (
    collection: GraphCollection[],
    dateWindow: [number, number],
  ): GraphCollection | undefined => {
    // find if there is someone locked.
    let chosenCollection = collection.find((value: GraphCollection, index: number, obj: GraphCollection[]) => {
      return !!value.locked;
    });

    if (chosenCollection) {
      return chosenCollection;
    } else {
      const gap = dateWindow[1] - dateWindow[0];
      chosenCollection = collection.find((collection: GraphCollection, index: number, obj: GraphCollection[]) => {
        if (collection.threshold) {
          return gap > collection.threshold.min && gap <= collection.threshold.max;
        }
      });
      return chosenCollection;
    }
  };
}
