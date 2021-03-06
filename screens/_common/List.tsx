import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, Text } from 'react-native';
import {
  withTheme,
  List as PaperList,
  Divider,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { ListItem } from '../../server/index.d';
import { Theme, IListStack, NewListParams } from './_types.d';
import { get, destroy } from './_helpers';

const styles = StyleSheet.create({
  p: {
    textAlign: 'center',
  },
  a: {
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

// ---------- Typing ---------- //

export interface Props {
  navigation: StackNavigationProp<IListStack, 'List'>;
  route: RouteProp<IListStack, 'List'>;
  theme: Theme;
  canDelete: boolean | ((li: ListItem) => boolean);
  deleteAlertMessage: string;
  itemDescriptionNumberOfLines?: number;
}

// Typing function List + props = 'params' not defined on 'route'.
// RouteProp is probably not made to support dynamic typing.
// So to use <List /> component, we need to type the route and navigation with
// 'List', no matter what screen of the stack is being displayed.
//
// export interface Props<
//   StackParamList extends StackWithListComponent,
//   ScreenName extends ListScreen
// > {
//   navigation: StackNavigationProp<StackParamList, ListScreen>;
//   route: RouteProp<StackParamList, ScreenName>;
//   theme: Theme;
//   canDelete: boolean | ((li: ListItem) => boolean);
//   deleteAlertMessage: string;
//   itemDescriptionNumberOfLines?: number;
// }

// ---------- COMPONENT ---------- //

const List: React.FC<Props> = ({
  navigation,
  route,
  theme,
  canDelete,
  deleteAlertMessage,
  itemDescriptionNumberOfLines,
}) => {
  // ---------- States ---------- //

  const [listData, setListData] = useState<ListItem[] | null>(null);
  const {
    fetchUrl,
    itemFetchUrl,
    itemScreen,
    itemPropInUrl,
    addItemScreen,
    update,
    itemScreenTitle,
    title,
  } = route.params;

  // ---------- Effects ---------- //

  useEffect(() => {
    get(fetchUrl).then((res) => {
      setListData(res.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (update) {
      const { itemIndex, itemData } = update;
      const newListData: ListItem[] = listData === null ? [] : [...listData];
      if (itemIndex != null) {
        // Handle item update
        newListData[itemIndex] = itemData;
        setListData(newListData);
      } else {
        // Handle item addition
        setListData(newListData.concat(itemData));
      }
      navigation.setParams({ update: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // ---------- Handlers ---------- //

  const handleItemPress = (index: number, listItem: ListItem) => () => {
    if (!itemScreen) {
      return;
    }

    const params: NewListParams = {
      index,
      data: listItem,
      title: itemScreenTitle ? itemScreenTitle + listItem.name : title,
    };

    if (itemFetchUrl && itemPropInUrl) {
      const item = listItem[itemPropInUrl].toString(); // id is a number
      params.fetchUrl = itemFetchUrl.replace('$item', item);
    }

    navigation.navigate(itemScreen, params);
  };

  const handleItemDelete = (index: number, itemId: number) => () => {
    destroy(`${fetchUrl}/${itemId}`).then((res) => {
      if (res.status === 'error') {
        console.log(res.message);
        return Alert.alert('Oops', res.message);
      }
      const newListData = [...listData!];
      newListData.splice(index, 1);
      setListData(newListData);
    });
  };

  const deleteAlert = (index: number, listItem: ListItem) => () => {
    Alert.alert(
      'Suppression',
      deleteAlertMessage.replace('$(itemName)', listItem.name),
      [
        { text: 'Annuler' },
        { text: 'OK', onPress: handleItemDelete(index, listItem.id) },
      ],
    );
  };

  // ---------- Render ---------- //

  if (title) {
    navigation.setOptions({ title });
  }

  let listComponent = null;

  if (listData == null) {
    listComponent = <ActivityIndicator animating style={theme.loading} />;
  } else if (listData.length === 0) {
    listComponent = <Text style={styles.p}>Liste vide, pour le moment !</Text>;
  } else {
    listComponent = listData.map((listItem: ListItem, index: number) => {
      const tmpCanDelete =
        typeof canDelete === 'function' ? canDelete(listItem) : !!canDelete;

      const handleLongPress = tmpCanDelete
        ? deleteAlert(index, listItem)
        : undefined;

      return (
        <React.Fragment key={`listItem_${listItem.id}`}>
          <PaperList.Item
            title={listItem.name}
            description={listItem.description}
            onLongPress={handleLongPress}
            onPress={handleItemPress(index, listItem)}
            descriptionNumberOfLines={itemDescriptionNumberOfLines || 2}
          />
          <Divider />
        </React.Fragment>
      );
    });
  }

  return (
    <>
      <ScrollView>{listComponent}</ScrollView>
      {!addItemScreen ? null : (
        <FAB
          style={theme.fab}
          icon="plus"
          onPress={() => {
            navigation.navigate(addItemScreen);
          }}
        />
      )}
    </>
  );
};

export default withTheme(List);
